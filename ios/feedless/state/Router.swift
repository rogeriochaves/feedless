//
//  Router.swift
//  feedless
//
//  Created by Rogerio Chaves on 25/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

class Router: ObservableObject {
    let profileScreen = ("profile", AnyView(ProfileScreen(id: nil)))
    let friendsScreen = ("friends", AnyView(FriendsScreen()))
    let secretsScreen = ("secrets", AnyView(SecretsScreen()))
    let communitiesList = ("communities", AnyView(CommunitiesList()))
    let searchScreen = ("search", AnyView(SearchScreen()))
    let debugScreen = ("debug", AnyView(Debug()))

    @Published var currentRoute: (String, AnyView)

    init() {
        self.currentRoute = self.profileScreen
    }

    func changeRoute(to: (String, AnyView)) {
        DispatchQueue.main.async {
            self.currentRoute = to
        }
    }
}
