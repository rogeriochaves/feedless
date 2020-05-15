//
//  ContentView.swift
//  feedless
//
//  Created by Rogerio Chaves on 28/04/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct Debug: View {
    @EnvironmentObject var entries : Entries
    @State private var selection = 0

    var body: some View {
        TabView(selection: $selection){
            VStack {
                List(entries.entries, id: \.key) { post in
                    Text(post.value)
                }
            }
        }.accentColor(Color.purple)
        .onAppear() {
            self.entries.load()
        }
    }
}

struct Debug_Previews: PreviewProvider {
    static var previews: some View {
        Debug()
        .environmentObject(Entries())
    }
}
