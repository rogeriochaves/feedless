//
//  ContentView.swift
//  feedless
//
//  Created by Rogerio Chaves on 28/04/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct Login: View {
    var body: some View {
        VStack {
            Text("Login Page")
            NavigationLink(destination: Wall()) {
                Text("Submit")
            }
            .navigationBarTitle(Text("Login"))
        }
    }
}

struct Login_Previews: PreviewProvider {
    static var previews: some View {
        Login()
    }
}

